import { app } from './app';
import { env } from './config/env';

const port = env.PORT;

app.listen(port, () => {
  process.stdout.write(`Server listening on port ${port}\n`);
});
