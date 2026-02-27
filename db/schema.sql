PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  about_me TEXT,
  profile_img_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Event (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  attendees_limit INTEGER,
  event_title TEXT NOT NULL,
  detail TEXT,
  trip_rules TEXT,
  event_img_path TEXT,
  recruit_question TEXT,
  closing_date TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS EventParticipants (
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Itinerary (
  itinerary_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  activity_name TEXT NOT NULL,
  expense REAL,
  activity_time TEXT,
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Location (
  location_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  place_name TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Tags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS UserTags (
  user_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, tag_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES Tags(tag_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS EventTags (
  event_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (event_id, tag_id),
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES Tags(tag_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RecruitAnswer (
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  recruit_answer TEXT,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Notification (
  noti_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_id INTEGER,
  noti_message TEXT NOT NULL,
  status_read INTEGER NOT NULL DEFAULT 0 CHECK (status_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Message (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  time_stamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Poll (
  poll_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  poll_question TEXT NOT NULL,
  end_time TEXT,
  FOREIGN KEY (event_id) REFERENCES Event(event_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PollOption (
  option_id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  FOREIGN KEY (poll_id) REFERENCES Poll(poll_id) ON DELETE CASCADE,
  UNIQUE (poll_id, option_id)
);

CREATE TABLE IF NOT EXISTS PollVote (
  poll_id INTEGER NOT NULL,
  option_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES Poll(poll_id) ON DELETE CASCADE,
  FOREIGN KEY (poll_id, option_id) REFERENCES PollOption(poll_id, option_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_creator_id ON Event (creator_id);
CREATE INDEX IF NOT EXISTS idx_eventparticipants_user_id ON EventParticipants (user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_event_id ON Itinerary (event_id);
CREATE INDEX IF NOT EXISTS idx_location_event_id ON Location (event_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON Notification (user_id);
CREATE INDEX IF NOT EXISTS idx_message_event_id ON Message (event_id);
CREATE INDEX IF NOT EXISTS idx_poll_event_id ON Poll (event_id);