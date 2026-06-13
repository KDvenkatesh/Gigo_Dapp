import dataclasses
import importlib
import logging
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from shutil import rmtree

from algokit_utils.config import config
from dotenv import load_dotenv

# Set trace_all to True to capture all transactions, defaults to capturing traces only on failure
config.configure(debug=True, trace_all=False)

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-10s: %(message)s"
)
logger = logging.getLogger(__name__)

@dataclasses.dataclass
class SmartContract:
    path: Path
    name: str
    deploy: Callable[[], None] | None = None

def import_contract(folder: Path) -> Path:
    """Imports the contract from a folder if it exists."""
    contract_path = folder / "contract.py"
    if contract_path.exists():
        return contract_path
    raise Exception(f"Contract not found in {folder}")

def import_deploy_if_exists(folder: Path) -> Callable[[], None] | None:
    """Imports the deploy function from a folder if it exists."""
    try:
        module_name = f"smart_contracts.{folder.name}.deploy_config"
        logger.debug(f"Attempting to import {module_name}")
        deploy_module = importlib.import_module(module_name)
        return deploy_module.deploy  # type: ignore[no-any-return, misc]
    except ImportError as e:
        logger.debug(f"No deploy_config found for {folder.name}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Error importing deploy_config for {folder.name}: {e}")
        return None

def has_contract_file(directory: Path) -> bool:
    """Checks whether the directory contains a contract.py file."""
    return (directory / "contract.py").exists()

def build(output_dir: Path, contract_path: Path) -> Path:
    """
    Builds the contract by exporting (compiling) its source and generating a client.
    If the output directory already exists, it is cleared.
    """
    output_dir = output_dir.resolve()
    if output_dir.exists():
        rmtree(output_dir, ignore_errors=True)
    output_dir.mkdir(exist_ok=True, parents=True)
    logger.info(f"Exporting {contract_path} to {output_dir}")

    build_result = subprocess.run(
        [
            "algokit",
            "--no-color",
            "compile",
            "python",
            str(contract_path.resolve()),
            f"--out-dir={output_dir}",
            "--output-source-map",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    if build_result.stdout:
        print(build_result.stdout)

    if build_result.returncode:
        raise Exception(f"Could not build contract:\n{build_result.stdout}")

    app_spec_file_names: list[str] = [
        file.name for file in output_dir.glob("*.arc56.json")
    ]

    client_file: str | None = None
    if not app_spec_file_names:
        logger.warning("No '*.arc56.json' file found. Skipping client generation.")
    else:
        for file_name in app_spec_file_names:
            client_file = file_name
            generate_result = subprocess.run(
                [
                    "algokit",
                    "generate",
                    "client",
                    str(output_dir),
                    "--output",
                    str(output_dir / f"{contract_path.parent.name}_client.py"),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            if generate_result.stdout:
                print(generate_result.stdout)
    if client_file:
        return output_dir / client_file
    return output_dir

def main(action: str, contract_name: str | None = None) -> None:
    """Main entry point to build and/or deploy smart contracts."""
    # Load environment variables explicitly
    env_path = Path(__file__).parent.parent / ".env"
    logger.info(f"Loading environment variables from {env_path}")
    load_dotenv(dotenv_path=env_path)
    
    root_path = Path(__file__).parent
    artifact_path = root_path / "artifacts"

    logger.info("Discovering contracts...")
    contracts: list[SmartContract] = []
    for folder in root_path.iterdir():
        if folder.is_dir() and has_contract_file(folder) and not folder.name.startswith("_"):
            logger.info(f"Found contract folder: {folder.name}")
            contracts.append(
                SmartContract(
                    path=import_contract(folder),
                    name=folder.name,
                    deploy=import_deploy_if_exists(folder),
                )
            )
    
    filtered_contracts = [
        c for c in contracts if contract_name is None or c.name == contract_name
    ]

    if not filtered_contracts:
        logger.warning(f"No contracts found matching: {contract_name}")
        return

    match action:
        case "build":
            for contract in filtered_contracts:
                logger.info(f"Building {contract.name}...")
                build(artifact_path / contract.name, contract.path)
        case "deploy":
            for contract in filtered_contracts:
                logger.info(f"Deploying {contract.name}...")
                if contract.deploy:
                    contract.deploy()
                else:
                    logger.warning(f"No deploy function for {contract.name}")
        case "all":
            for contract in filtered_contracts:
                build(artifact_path / contract.name, contract.path)
                if contract.deploy:
                    contract.deploy()

if __name__ == "__main__":
    if len(sys.argv) > 2:
        main(sys.argv[1], sys.argv[2])
    elif len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        main("all")
