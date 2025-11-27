class SqlAdapter {
  constructor(collection) {
    this.collection = collection;
    this.db = null;
  }

  async connect() {
    throw new Error('SQL adapter not implemented. Install your preferred SQL driver and configure connection.');
  }

  async findAll() {
    throw new Error('SQL adapter not implemented');
  }

  async findById(id) {
    throw new Error('SQL adapter not implemented');
  }

  async findOne(query) {
    throw new Error('SQL adapter not implemented');
  }

  async find(query) {
    throw new Error('SQL adapter not implemented');
  }

  async create(item) {
    throw new Error('SQL adapter not implemented');
  }

  async update(id, updates) {
    throw new Error('SQL adapter not implemented');
  }

  async delete(id) {
    throw new Error('SQL adapter not implemented');
  }

  async deleteMany(query) {
    throw new Error('SQL adapter not implemented');
  }

  async count(query = {}) {
    throw new Error('SQL adapter not implemented');
  }

  async insertMany(items) {
    throw new Error('SQL adapter not implemented');
  }
}

module.exports = SqlAdapter;
