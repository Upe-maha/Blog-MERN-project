import user from "../models/user";
import { hashPassword } from "../utils/hashPassword";

export const registerUser = async (req: any, res: any) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Please fill all the fields" });
    }
    try {
        const existingUser = await user.findOne({
            $or: [{ username: username }, { email: email }]
        });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = new user({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        return res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from registerUser" });
    }
}

export const getUsers = async (req: any, res: any) => {
    try {
        const users = await user.find();
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error from getUser" });
    }
};

export const getUserById = async (req: any, res: any) => {
    const { id } = req.params;

    try {
        const userById = await user.findById(id);
        if (!userById) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(userById);
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error from getUserById" });
    }
};

export const updateUser = async (req: any, res: any) => {
    const { id } = req.params;
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Please fill all the fields" });
    }
    try {
        const existingUser = await user.findOne({
            $or: [{ username: username }, { email: email }]
        })
        if (existingUser && existingUser._id.toString() !== id) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await hashPassword(password);

        const updateUser = await user.findByIdAndUpdate(id,
            {
                username,
                email,
                password: hashedPassword,
            },
            {
                new: true,
                runValidators: true
            }
        )
        return res.status(200).json({ message: "User updated successfully", user: updateUser });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from updateUser" });
    }
}


export const deleteUser = async (req: any, res: any) => {
    const { id } = req.params;
    try {
        const deletedUser = await user.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error from deleteUser" });
    }
}