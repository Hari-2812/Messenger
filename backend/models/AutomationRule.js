const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    trigger: {
      type: String,
      enum: ['user_replied', 'message_not_read', 'form_submitted', 'course_purchased'],
      required: true,
    },
    conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
    actions: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

automationRuleSchema.index({ trigger: 1, isActive: 1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
