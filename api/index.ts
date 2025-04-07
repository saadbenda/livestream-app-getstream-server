import express from "express";
import dotenv from "dotenv";
import {genSaltSync, hashSync} from "bcrypt";
import {StreamChat} from "stream-chat";
import bodyParser from "body-parser";
import { sql } from "@vercel/postgres";

dotenv.config();

const {PORT, STREAM_API_KEY, STREAM_API_SECRET} = process.env;
const client = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);

// Create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });

const app = express();
app.use(express.json());

interface User {
    id: string;
    email: string;
    hashed_password: string;
}
const USERS: User[] = [];
const salt = genSaltSync(10);


app.get('/', function (req, res) {
    res.status(200).send('Hello World!');
});


app.post('/register', async (req: any, res: any) => {
    const {email, password} = req.body;
    const existingUser = USERS.find((user) => user.email === email);
    if (existingUser) {
        return res.status(400).json({error: "User already exists"});
    }

    try {
        const hashedPassword =hashSync(password, salt);
        const id = Math.random().toString(36).substring(2, 15);
        console.log(`id: ${id}`);
        const newUser = {
            id,
            email,
            hashed_password: hashedPassword
        };
        USERS.push(newUser);
        await client.upsertUser({
            id,
            email,
            name: email,
        });

        const token = client.createToken(id);

        return res.status(200).json({token, user: {id, email}});

    }catch(err) {
        console.error(err);
        return res.status(500).json({error: "Internal server error"});
    }
    return res.status(200).json({user: existingUser});
});

app.post('/login', async (req: any, res: any) => {
    const {email, password} = req.body;
    const user = USERS.find((user) => user.email === email);
    if (!user) {
        return res.status(400).json({error: "User not found"});
    }

    try {
        if (user.hashed_password !== hashSync(password, salt)) {
            return res.status(401).json({error: "Invalid credentials"});
        }
        const token = client.createToken(user.id);
        return res.status(200).json({token, user: {id: user.id, email}});
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: "Internal server error"});
    }
})

app.listen(3000, () => console.log('Server ready on port 3000.'));