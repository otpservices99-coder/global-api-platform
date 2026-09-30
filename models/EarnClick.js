const mongoose = require("mongoose");

const earnClickSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EarnSession",
      required: true,
      index: true
    },

    provider: {
      type: String,
      required: true,
      index: true
    },

    placement: {
      type: String,
      default: null
    },

    clickedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

earnClickSchema.index({ project: 1, session: 1 });
earnClickSchema.index({ project: 1, user: 1, provider: 1, clickedAt: -1 });

module.exports = mongoose.model("EarnClick", earnClickSchema);
