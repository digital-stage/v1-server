import Auth from "./IAuthentication";
import IAuthentication = Auth.IAuthentication;
import GoogleAuthentication from "./google/GoogleAuthentication";

export const authentication: IAuthentication = new GoogleAuthentication();