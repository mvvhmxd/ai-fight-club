import 'dotenv/config';
import { AuthPayload } from './auth';
declare const app: import("express-serve-static-core").Express;
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
export default app;
//# sourceMappingURL=index.d.ts.map