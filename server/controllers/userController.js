import imageKit from "../configs/imageKit.js";
import { Connection } from "../models/Connection.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import fs from "fs";

// Get user data using userId
export const getUserData = async(req, res)=>{
    try {
        const {userId} = req.auth();
        const user = await User.findById(userId)
        if(!user){
            return res.json({success: false, message: "User not found"})
        }
        res.json({success: true, user})
    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

export const updateUserData = async(req, res)=>{
    try {
        const {userId} = req.auth();
        const {username, bio, location, full_name} = req.body;
        
        const tempUser = await User.findById(userId)

        !username && (username = tempUser.username)

        if(tempUser.username !== username){
            const user = await User.findOne({username})
            if(user){
                // We will not change the username if it is already taken
                username = tempUser.username
            }
        }

        const updateData = {
            username,
            bio,
            location,
            full_name
        }

        const profile = req.files.profile && req.files.profile[0]
        const cover = req.files.cover && req.files.cover[0]

        if(profile){
            const buffer = fs.readFileSync(profile.path)
            const response = await imageKit.upload({
                file: buffer,
                fileName: profile.originalName
            })

            const url = imageKit.url({
                path: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '512'},
                ]
            })

            updateData.profile_picture = url;
        }

        if(cover){
            const buffer = fs.readFileSync(cover.path)
            const response = await imageKit.upload({
                file: buffer,
                fileName: profile.originalName
            })

            const url = imageKit.url({
                path: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '512'},
                ]
            })

            updateData.cover_photo = url;
        }

        const user = await User.findByIdAndUpdate(userId, updateData, {new : true});

        res.json({success: true, user, message: "Profile Updated SuccessFully"});

    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// Find users using username, email, location, name
export const discoverUsers = async(req, res)=>{
    try {
        const {userId} = req.auth();
        const {input} = req.body;

        const allUsers = await User.find({
            $or: [
                {username: new RegExp(input, 'i')},
                {email: new RegExp(input, 'i')},
                {location: new RegExp(input, 'i')},
                {name: new RegExp(input, 'i')},
            ]
        })
        const filteredUser = allUsers.filter(user => user._id !== userId);

        res.json({success: true, users: filteredUser})

    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// Follow user
export const followUser = async(req, res)=>{
    try {
        const {userId} = req.auth;
        const {id} = req.body;   // user jisko follow krna chahta h
        
        // jo user follow krega
        const user = await User.findById(userId);

        // check follow kiya h ya nhi
        if(user.following.include(id)){
            return res.json({success: false, message: "You are already following this user"});
        }

        // jo follow kr rha h uska following bdhega
        user.following.push(id);
        await user.save();

        // jisko follow kr rha h uska follower bdhega
        const toUser = await User.findById(id);
        toUser.followers.push(userId);
        await toUser.save();

        res.json({succes: true, message: 'Now you are follow this user'});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

// Unfollow user
export const unfollowUser = async(req, res)=>{
    try {
        const {userId} = req.auth;   
        const {id} = req.body;   // jisko user unfollow krna chahta h

        const user = await User.findById(userId);  

        // jo unfollow krna chahta h v uska following km hoga
        user.following = user.following.filter( user => user._id !== id);
        await user.save();

        // jisko user unfollow krna chahta h uska follower km hoga
        const toUser = await User.findById(id);
        toUser.followers = toUser.followers.filter( user => user._id !== userId);
        await toUser.save();

        res.json({succes: true, message: 'You are no longer following this user'});

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// Send connection request
export const sendConnectioRequest = async(req, res)=>{
    try {
        const {userId} = req.auth;
        const {id} = req.body;

        // Check if user has sent more than 20 connection request in the last 24 hours
        const last24Hours = new Date.now() - 24*60*60*100;
        const connectionRequests = await Connection.find({from_user_id: userId, created_at: {$gt: last24Hours}});
        if(connectionRequests.length >= 20){
            return res.json({success: false, message: "You have sent more than 20 connection requests in the last 24 hours"});
        }

        // Check if users are already connected
        const connection = await Connection.findOne({
            $or: [
                {from_user_id: userId, to_user_id: id},
                {from_user_id: id, to_user_id: userId}
            ]
        })

        if(!connection){
            await Connection.create({
                from_user_id: userId,
                to_user_id: id
            })
            return res.json({success: true, message: 'Connection request sent successfully'});
        }
        else if(connection && connection.status === 'accepted'){
            return res.json({success: false, message: 'You are already connected with this user'});
        }
        return res.json({success: false, message: 'Connection request pending'});

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// Get user connection
export const getUserConnection = async(req, res)=>{
    try {
        const {userId} = req.auth;
        const user = User.findById(userId).populate('connections followers following');

        const connections = user.connections;
        const followers = user.followers;
        const following = user.following;

        const pendingConnections = (await Connection.find({to_user_id: userId, status: 'pendng'})
         .populate('from_user_id')).map(connection => connection.from_user_id);
        
        res.json({success: true, connections, followers, following, pendingConnections});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// 
export const acceptConnectionRequest = async(req, res)=>{
    try {
        const {userId} = req.auth;
        const {id} = req.body;

        const connection = await Connection.findOne({from_user_id: id, to_user_id: userId})

        if(!connection){
            return res.json({success: false, message: 'Connection not found'});
        }

        const user = await User.findById(userId);
        user.connections.push(id);
        await user.save();

        const toUser = await User.findById(id);
        toUser.connections.push(userId);
        await toUser.save();

        connection.status = 'accepted';
        await connection.save();

        res.json({success: true, message: 'Connection accepted successfully'});

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// Get user profile
export const getUserProfile = async(req, res) =>{
    try {
        const {profileId} = req.body;
        const profile = await User.findById(profileId);
        if(!profile){
            return res.json({success: false, message: "Profile not found"});
        }
        const posts = await Post.find({user: profileId}).populate('user');

        res.json({success: true, profile, posts});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}