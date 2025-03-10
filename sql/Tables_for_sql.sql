CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,         -- Уникальный идентификатор пользователя
    username VARCHAR(50) NOT NULL UNIQUE, -- Имя пользователя
    email VARCHAR(100) NOT NULL UNIQUE, -- Email пользователя
    password VARCHAR(255) NOT NULL,    -- Хэшированный пароль
    created_at TIMESTAMP DEFAULT NOW() -- Дата создания пользователя
);

-- Таблица для хранения данных о шахматных игроках
CREATE TABLE chess_players (
    player_id SERIAL PRIMARY KEY,       -- Уникальный идентификатор игрока
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE, -- Связь с таблицей users
    wins INT DEFAULT 0,                 -- Количество побед
    losses INT DEFAULT 0,               -- Количество поражений
    total_games INT DEFAULT 0,          -- Общее количество игр
    win_rate DECIMAL(5, 2) DEFAULT 0.00, -- Процент побед
    cr DECIMAL(10, 2) DEFAULT 0.00      -- Рейтинг игрока (CR)
);

ALTER TABLE chess_players
ADD COLUMN rank INT DEFAULT NULL;

ALTER TABLE chess_players
ADD COLUMN draws INT DEFAULT 0;

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
