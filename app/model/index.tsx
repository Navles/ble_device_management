import { Models } from '@rematch/core';
import LoginModel from './loginModel';

export interface RootModel extends Models<RootModel> {
  LoginModel: typeof LoginModel;
}

export const models: RootModel = {
  LoginModel,
};

export default models;