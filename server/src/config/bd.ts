import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`MongoDB connected: ${connect.connection.host}`)
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err}`);
        process.exit(1);
    }
}

export default connectDB;