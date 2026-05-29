const mongoose = require('mongoose');

async function getUsers() {
  await mongoose.connect('mongodb+srv://shaikishaq401:shaikishaq401@gigodapp.bgi6mow.mongodb.net/');
  const db = mongoose.connection.db;
  const rides = await db.collection('rides').find({}).sort({_id: -1}).limit(5).toArray();
  for (const r of rides) {
    console.log(`Customer: ${r.customer}`);
  }
  process.exit(0);
}

getUsers();
