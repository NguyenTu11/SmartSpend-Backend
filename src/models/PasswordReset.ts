import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IPasswordReset extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    codeHash: string;
    expiredAt: Date;
    compareCode(code: string): Promise<boolean>;
    createdAt: Date;
    updatedAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        email: { type: String, required: true },
        codeHash: { type: String, required: true },
        expiredAt: { type: Date, required: true }
    },
    { timestamps: true }
);

passwordResetSchema.pre<IPasswordReset>("save", async function () {
    const salt = await bcrypt.genSalt(10);
    this.codeHash = await bcrypt.hash(this.codeHash, salt);
});

passwordResetSchema.methods.compareCode = function (code: string) {
    return bcrypt.compare(code, this.codeHash);
};

export const PasswordReset = mongoose.model<IPasswordReset>(
    "PasswordReset",
    passwordResetSchema
);
