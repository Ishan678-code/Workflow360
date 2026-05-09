import mongoose from "mongoose";

const UserSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:["ADMIN","EMPLOYEE","FREELANCER","MANAGER"],
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    lastLogout:{
        type:Date,
        default:null
    },
    passwordResetToken:{
        type:String,
        default:null
    },
    passwordResetExpires:{
        type:Date,
        default:null
    }
},{timestamps:true});


const User=mongoose.model("User",UserSchema);
export default User;
