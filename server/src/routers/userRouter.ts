import { Router } from "express";
import { deleteUser, getUserById, getUsers, registerUser, updateUser } from "../controllers/user.controllers";

const router = Router();

router.post("/register", registerUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);


export default router;