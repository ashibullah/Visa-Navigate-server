require('dotenv').config();
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())
app.listen(port, () => {
  console.log("Server is running on port: ", port);
})

const db_username = process.env.DB_USER;
const db_password = process.env.DB_PASS;


const uri = `mongodb+srv://${db_username}:${db_password}@cluster0.91k5x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
app.get('/', async (req, res) => {
  res.send("Server is running fine");
})



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const myDB = client.db("Visa-Navigator");
    const myColl = myDB.collection("Visa");
    const myUserColl = myDB.collection("Users");
    const visaApplicantColl = myDB.collection("VisaApplicants");

    app.post('/visa', async (req, res) => {
      const visa = req.body;
      const result = await myColl.insertOne(visa);
      // console.log("New visa: ", visa)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { uid: user.uid }
      // console.log(query);
      const userExistence = await myUserColl.findOne(query);
      if (!userExistence) {
        const result = await myUserColl.insertOne(user);
      }
      // console.log("New user: ", user)
    })

    app.get('/visa', async (req, res) => {
      const result = await myColl.find().toArray();
      res.send(result)
    })


    app.get('/visa/latest', async (req, res) => {
      const result = await myColl.find().sort({ uploadTime: -1 }).limit(6).toArray();
      res.send(result)
    })

    app.get('/visas/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const query = { _id: new ObjectId(id) };
        const result = await myColl.findOne(query)
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error to find visa', error });
      }
    })

    app.get('/visa/addedBy/:id', async (req,res)=>{
      const id = req.params.id;
      const query = { addedBy : id };
      const result = await myColl.find(query).toArray();
      res.send(result);
    })

    app.delete('/visa/delete/:id', async (req,res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id) };
      const result = await visaApplicantColl.deleteOne(query);
      res.send(result);
    })


    app.post('/visa/apply', async(req,res)=>{
      const appliedVisa = req.body;
      const query = {
        visaId : appliedVisa.visaId ,
        email : appliedVisa.email
      }
      try{
        const result = await visaApplicantColl.findOne(query);
        if(!result) {
          await visaApplicantColl.insertOne(appliedVisa);
          res.json({ result: true });
        }
        else res.json({ result: false });
      }
      catch(err){
        res.json({ error: err.message });
      }
    })
    
    app.get('/visa/myVisa/:id', async (req,res)=>{
        const id = req.params.id;
        const query = { email : id } 
        const result= await visaApplicantColl.find(query).toArray();
       
        const visaPromises = result.map(async(item) => {
          // console.log(item.visaId);
          const visaId = item.visaId;
          const query = { _id: new ObjectId(visaId) };
          const VID = item._id.toString();
          let visaResult = await myColl.findOne(query)
          visaResult.applicationId = VID;
          // console.log(visaResult.applicationId);
          // console.log(visaResult);
          return visaResult;
          

        })
        const visaArray = await Promise.all(visaPromises);
        // console.log(visaArray);
        res.send(visaArray);
    })

    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);
