
import app from "./app";
import connectDB from "./config/db";
import dotenv from "dotenv";


const port = process.env.PORT || 5000;

dotenv.config();

connectDB();

app.get("/", (req, res) => {
    res.send("Hello form the server of bolg app");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});