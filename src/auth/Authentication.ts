import Auth from "./IAuthentication";
import IAuthentication = Auth.IAuthentication;
import DefaultAuthentication from "./default/DefaultAuthentication";

export const authentication: IAuthentication = new DefaultAuthentication();