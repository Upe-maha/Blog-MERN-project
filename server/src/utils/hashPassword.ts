import hash from "bcryptjs";

export const hashPassword = async (password: string) => {
    const salt = await hash.genSalt(10);
    const hashedPassword = await hash.hash(password, salt);
    return hashedPassword;
}

export const comparePassword = async (password: string, hashedPassword: string) => {
    const isMatch = await hash.compare(password, hashedPassword);
    return isMatch;
}