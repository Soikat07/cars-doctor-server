const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s5ynbm1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify jwt token
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({error:true, message:'Unauthorized access'})
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.DB_ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'Unauthorized access' });
    }
    req.decoded = decode;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db('carsDoctor').collection('services');
    const bookingsCollection = client.db('carsDoctor').collection('bookings');

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.DB_ACCESS_TOKEN_SECRET, {
        expiresIn:'1hr'
      });
      res.send({token});
    })

    // get all data from database
    app.get('/services', async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // get single data from database
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });


    // bookings
    // create data in database
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    // get some data from booking database
    app.get('/bookings', verifyJwt, async (req, res) => {
      
      const decode = req.decoded;
      console.log('came back after verify', decode);

      if (decode.email !== req.query.email) {
        return res.status(403).send({error:true, message:'Forbidden access'})
      }

      // console.log(req.headers.authorization);
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    //update booking data(exist update=patch, update+create =put)
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateBooking = req.body;
      const updateDoc = {
        $set: {
          status: updateBooking.status
       },
      }
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // delete a data from bookings database
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Cars Doctor Server is Running");
})

app.listen(port, () => {
  console.log(`Cars Doctor Is Running On Port: ${port}`);
})