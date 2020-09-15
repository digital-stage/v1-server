import Auth from "./IAuthentication";
import DefaultAuthentication from "./default/DefaultAuthentication";
import IAuthentication = Auth.IAuthentication;

export const authentication: IAuthentication = new DefaultAuthentication();