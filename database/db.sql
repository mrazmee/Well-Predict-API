CREATE Table users (
  user_id integer AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  email varchar(100) NOT NULL,
  password varchar(100) NOT NULL,
  created_at timestamp,
  PRIMARY KEY (user_id)
);

CREATE Table tokens (
  id_token int AUTO_INCREMENT NOT NULL,
  user_id int(11) NOT NULL,
  token text NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id_token),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
