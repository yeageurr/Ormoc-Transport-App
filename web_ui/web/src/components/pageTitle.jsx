import React, { useEffect } from "react";

const setTitle = (title) => {
  useEffect(() => {
    document.title = `${title}`;
  }, []);
};


export default setTitle;
