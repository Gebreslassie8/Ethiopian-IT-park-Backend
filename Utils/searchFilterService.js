/**
 * Reusable search and filter query builder
 * 
 * @param {Object} options
 * @param {string} options.table - main table to query
 * @param {Array<string>} options.searchFields - fields to search in (title, author, etc.)
 * @param {Object} options.filters - key-value filters like { category_id: 1, access_level: 'public' }
 * @param {string} [options.search] - keyword to search
 * @returns {Object} query and values for prepared statement
 */
function buildSearchFilterQuery({ table, searchFields = [], filters = {}, search = '' }) {
  let baseQuery = `SELECT * FROM ${table}`;
  const conditions = [];
  const values = [];

  // Search condition
  if (search && searchFields.length > 0) {
    const searchCondition = searchFields
      .map(field => `${field} LIKE ?`)
      .join(' OR ');
    conditions.push(`(${searchCondition})`);
    searchFields.forEach(() => values.push(`%${search}%`));
  }

  // Filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = ?`);
      values.push(value);
    }
  });

  // Combine conditions
  if (conditions.length > 0) {
    baseQuery += ` WHERE ${conditions.join(' AND ')}`;
  }

  return {
    query: baseQuery,
    values
  };
}

module.exports = {
  buildSearchFilterQuery,
};
