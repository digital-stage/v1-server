import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";

namespace HttpService {
    export const init = (app: core.Express) => {
        app.use(expressPino());
        app.get('/', function (req, res) {
            res.send('Hello World!');
        });
    }
}
export default HttpService;