import session from 'express-session';
import connectMongoDBSession from 'connect-mongodb-session';

const MongoDBStore = connectMongoDBSession(session);

const store = new MongoDBStore({
  uri: process.env.MONGO_URL!,
  collection: 'sessions'
});

store.on('error', function (error: any) {
  console.error(error);
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your_secret_key', // 替换为你的秘密键
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 7 * 1000 * 60 * 60 * 24 // 7 days
  }
});

export default sessionMiddleware;
