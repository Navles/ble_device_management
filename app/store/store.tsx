import { init, RematchDispatch, RematchRootState } from '@rematch/core';
import logger from 'redux-logger';
import { models, RootModel } from '../model/index';

export const store = init({
  models,
  redux: {
    middlewares: [logger],
  },
});

export type Store = typeof store;
export type Dispatch = RematchDispatch<RootModel>;
export type RootState = RematchRootState<RootModel>;

export default store;
