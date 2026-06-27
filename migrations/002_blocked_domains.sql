CREATE TABLE IF NOT EXISTS blocked_domains (
  domain       TEXT        PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO blocked_domains (domain) VALUES
  ('gmail.com'), ('googlemail.com'),
  ('yahoo.com'), ('yahoo.co.uk'), ('yahoo.co.in'), ('ymail.com'),
  ('hotmail.com'), ('hotmail.co.uk'), ('hotmail.fr'),
  ('outlook.com'), ('outlook.co.uk'), ('outlook.in'),
  ('live.com'), ('live.co.uk'), ('live.in'),
  ('msn.com'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('aol.com'),
  ('zoho.com'),
  ('protonmail.com'), ('proton.me'), ('pm.me'),
  ('tutanota.com'), ('tutanota.de'), ('tuta.io'),
  ('fastmail.com'), ('fastmail.fm'),
  ('hey.com'),
  ('mail.com'), ('email.com'),
  ('gmx.com'), ('gmx.net'), ('gmx.de'),
  ('qq.com'), ('163.com'), ('126.com'), ('sina.com'),
  ('rediffmail.com'),
  ('mail.ru'), ('yandex.ru'), ('yandex.com'),
  ('inbox.com'),
  ('rocketmail.com'),
  ('sbcglobal.net'), ('att.net'), ('verizon.net'),
  ('comcast.net'), ('cox.net'), ('charter.net'),
  ('bellsouth.net'), ('earthlink.net')
ON CONFLICT (domain) DO NOTHING;
