-- Apelido opcional; o nome original continua sendo a referência das súmulas.
ALTER TABLE public.athletes ADD COLUMN nickname text;
ALTER TABLE public.athletes ADD CONSTRAINT athletes_nickname_length CHECK (nickname IS NULL OR char_length(nickname) <= 40);
