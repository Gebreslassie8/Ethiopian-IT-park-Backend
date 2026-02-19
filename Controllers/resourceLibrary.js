const Tab = require('../Models/resourceLibrary');


exports.getTabs = async (req, res) => {
  try {
    const tabs = await Tab.getTabs();
    res.json(tabs); // ✅ must return array
  } catch (err) {
    console.error("Failed to fetch tabs:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};