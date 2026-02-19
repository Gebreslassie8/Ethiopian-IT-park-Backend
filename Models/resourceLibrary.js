const db= require("../Config/db");

const Tab = {
  async getTabs() {
    try {
      const [rows] = await db.query(
        "SELECT category_id AS `key`, name, parent_category_id FROM categories"
      );
      return rows.map(row => ({
        key: String(row.key),
        name: row.name,
        parent: row.parent_category_id ? String(row.parent_category_id) : null,
        icon: null
      }));
    } catch (err) {
      console.error("Error in getTabs:", err);
      throw err;
    }
  }
};
module.exports = Tab;