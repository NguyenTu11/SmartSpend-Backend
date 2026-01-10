import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IEmailVerification extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    codeHash: string;
    expiredAt: Date;
    compareCode(code: string): Promise<boolean>;
    createdAt: Date;
    updatedAt: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        email: { type: String, required: true },
        codeHash: { type: String, required: true },
        expiredAt: { type: Date, required: true }
    },
    { timestamps: true }
);

emailVerificationSchema.pre<IEmailVerification>("save", async function () {
    const salt = await bcrypt.genSalt(10);
    this.codeHash = await bcrypt.hash(this.codeHash, salt);
});

emailVerificationSchema.methods.compareCode = function (code: string) {
    return bcrypt.compare(code, this.codeHash);
};

export const EmailVerification = mongoose.model<IEmailVerification>(
    "EmailVerification",
    emailVerificationSchema
);
