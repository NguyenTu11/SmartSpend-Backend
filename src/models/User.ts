import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
    email: string;
    password?: string;
    name: string;
    avatar: { url: string; publicId: string };
    bio?: string;
    isVerified: boolean;
    googleId?: string;
    currency: string;
    language: string;
    comparePassword(candidate: string): Promise<boolean>;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String },
        name: { type: String, required: true },
        avatar: { url: String, publicId: String },
        bio: String,
        isVerified: { type: Boolean, default: false },
        googleId: { type: String, sparse: true },
        currency: { type: String, default: "VND" },
        language: { type: String, default: "vi" }
    },
    { timestamps: true }
);

userSchema.pre<IUser>("save", async function () {
    if (!this.isModified("password") || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (candidate: string) {
    if (!this.password) return Promise.resolve(false);
    return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
