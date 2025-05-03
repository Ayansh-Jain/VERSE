export const getTopVersePointUsers = async () => {
  try {
    const response = await fetch('/api/top-versepoint-users'); // Replace with your API endpoint
    if (!response.ok) throw new Error('Failed to fetch top VersePoint users');
    return await response.json();
  } catch (error) {
    console.error('Error in getTopVersePointUsers:', error);
    throw error;
  }
};