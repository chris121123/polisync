// functions.invoke leaves `data` empty on non-2xx; the real reason is in error.context.
export const invokeError = async (error) => {
  try {
    return (await error.context?.json())?.error ?? error.message;
  } catch {
    return error.message;
  }
};