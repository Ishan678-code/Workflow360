import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://awasthishrey11_db_user:Workflow123@cluster0.io9i74t.mongodb.net/workflow360?retryWrites=true&w=majority&appName=Cluster0')
.then(() => { console.log('CONNECTED!'); process.exit(0); })
.catch(err => { console.log('ERROR:', err.message); process.exit(1); });