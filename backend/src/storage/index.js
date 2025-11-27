const JsonAdapter = require('./jsonAdapter');
const MongoAdapter = require('./mongoAdapter');
const SqlAdapter = require('./sqlAdapter');

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'json';

const getAdapter = (collection) => {
  switch (STORAGE_TYPE) {
    case 'mongodb':
      return new MongoAdapter(collection);
    case 'sql':
    case 'mysql':
    case 'postgres':
    case 'postgresql':
      return new SqlAdapter(collection);
    case 'json':
    default:
      return new JsonAdapter(collection);
  }
};

const Storage = {
  forms: getAdapter('forms'),
  leads: getAdapter('leads'),
  agents: getAdapter('agents'),
  mapping: getAdapter('mapping'),
  messages: getAdapter('messages'),
  conversations: getAdapter('conversations'),
};

module.exports = Storage;
