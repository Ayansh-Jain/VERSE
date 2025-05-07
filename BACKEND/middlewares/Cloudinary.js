export const transformUrl = (url) => {
    // insert transformation right after "/upload/"
    return url.replace(
      "/upload/",
      "/upload/f_auto,q_auto,w_800/"
    );
  };