const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

const readData = (collection) => {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${collection}:`, error);
    return [];
  }
};

const writeData = (collection, data) => {
  const filePath = getFilePath(collection);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${collection}:`, error);
    return false;
  }
};

class JsonAdapter {
  constructor(collection) {
    this.collection = collection;
  }

  async findAll() {
    return readData(this.collection);
  }

  async findById(id) {
    const data = readData(this.collection);
    return data.find(item => item.id === id) || null;
  }

  async findOne(query) {
    const data = readData(this.collection);
    return data.find(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    }) || null;
  }

  async find(query) {
    const data = readData(this.collection);
    return data.filter(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  }

  async create(item) {
    const data = readData(this.collection);
    const newItem = {
      id: item.id || `${this.collection}-${Date.now()}`,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newItem);
    writeData(this.collection, data);
    return newItem;
  }

  async update(id, updates) {
    const data = readData(this.collection);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    data[index] = {
      ...data[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeData(this.collection, data);
    return data[index];
  }

  async delete(id) {
    const data = readData(this.collection);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    data.splice(index, 1);
    writeData(this.collection, data);
    return true;
  }

  async deleteMany(query) {
    const data = readData(this.collection);
    const filtered = data.filter(item => {
      return !Object.keys(query).every(key => item[key] === query[key]);
    });
    writeData(this.collection, filtered);
    return data.length - filtered.length;
  }

  async count(query = {}) {
    const data = await this.find(query);
    return data.length;
  }

  async insertMany(items) {
    const data = readData(this.collection);
    const newItems = items.map(item => ({
      id: item.id || `${this.collection}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    data.push(...newItems);
    writeData(this.collection, data);
    return newItems;
  }
}

module.exports = JsonAdapter;
