import express from 'express';
import { protect } from '../middlewares/auth.js';
import { discoverUsers, followUser, getUserData, unfollowUser, updateUserData } from '../controllers/userController.js';
import { upload } from '../configs/multer.js';

const userRouter = express.Router();

userRouter.get('/data', protect, getUserData);
userRouter.get('/update', upload.fields([{name: 'profile', maxCount: 1},
    {name: 'cover', maxCount: 1}]) , protect, updateUserData);
userRouter.get('/discover', protect, discoverUsers);
userRouter.get('/follow', protect, followUser);
userRouter.get('/dunfollow', protect, unfollowUser);

export default userRouter;