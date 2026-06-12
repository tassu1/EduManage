const mongoose = require("mongoose");
const schoolSchema = new mongoose.Schema({
  name: { type: String,
    required: true,
     unique: true
    },
  code: { type: String,
    required: true,
     unique: true 
   },
  address: { type: String, 
   required: true 
},
  adminId: { type: mongoose.Schema.Types.ObjectId,
    ref: "User" 
   },

  superAdmin: { type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
    },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, 
   ref: "User" 
}],
  students: [{ type: mongoose.Schema.Types.ObjectId, 
   ref: "User"
 }],
  parents: [{ type: mongoose.Schema.Types.ObjectId, 
   ref: "User" 
}],
  staff: [{ type: mongoose.Schema.Types.ObjectId,
    ref: "User"

    }],
  timetable: [{ type: mongoose.Schema.Types.Mixed }],
  examSchedules: [{ type: mongoose.Schema.Types.Mixed }],
  feesStructure: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("School", schoolSchema);