CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chess_players (
    player_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    total_games INT DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0.00,
    cr DECIMAL(10, 2) DEFAULT 0.00
);

-- Alters

ALTER TABLE chess_players
ADD COLUMN rank INT DEFAULT NULL;

ALTER TABLE chess_players
ADD COLUMN draws INT DEFAULT 0;

-- Views

CREATE OR REPLACE VIEW chess_players_with_rank AS
SELECT 
    cp.player_id,
    cp.user_id,
    cp.wins,
    cp.losses,
    cp.draws,
    cp.total_games,
    cp.win_rate,
    cp.cr,
    DENSE_RANK() OVER (ORDER BY cp.cr DESC) AS rank
FROM 
    chess_players cp;
