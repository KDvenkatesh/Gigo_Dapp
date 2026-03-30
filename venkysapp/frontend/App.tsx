// import React from "react";
// import Home from './home';
// import Fp from './Firstpage';
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import DiceGame from "./DiceGame";       // Main game page (also Home)
// import Firstpage from "./fpage";         // Optional second page
// import NotFound from "./Notfound";       // 404 fallback

// import {BrowserRouter, Route , Routes} from 'react-router-dom';


// export default function App(){
//   return(
//     <>
//     <BrowserRouter>
//     <Routes>
//       {/* <Home/> */}
//       <Route path="/" element={<DiceGame />} />
//       <Route path="/first" element={<Firstpage />} />
//       <Route path="*" element={<NotFound />} />
     
//     </Routes>
//     </BrowserRouter>
//     </>
//   );
// }



import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DiceGame from "./DiceGame";
import Firstpage from "./Firstpage";
import NotFound from "./Notfound";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiceGame />} />
        <Route path="/first" element={<Firstpage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
