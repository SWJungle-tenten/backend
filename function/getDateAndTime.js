const getDateAndTime = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const time = now.toLocaleTimeString();
  const dateTime = {
    time: time,
    date: date,
  };
  return dateTime;
};

module.exports = { getDateAndTime };
