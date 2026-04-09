import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: "student" | "admin";
  profileCompleted: boolean;
  fullName?: string;
  joiningDate?: string;
  collegeName?: string;
  branch?: string;
  section?: string;
  year?: string;
  semester?: string;
  subject?: string;
  interestArea?: string;
  interestAreaCustom?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true, default: "" },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    profileCompleted: { type: Boolean, default: false },
    fullName: { type: String },
    joiningDate: { type: String },
    collegeName: { type: String },
    branch: { type: String },
    section: { type: String },
    year: { type: String },
    semester: { type: String },
    subject: { type: String },
    interestArea: { type: String },
    interestAreaCustom: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string;
  time: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, required: true, default: "Present" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.models.Attendance ?? mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export interface ISetting extends Document {
  key: string;
  value: string;
}

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

export const Setting = mongoose.models.Setting ?? mongoose.model<ISetting>("Setting", SettingSchema);
