// Test chat endpoint
const payload = {
  prompt: "something fun tonight in midtown",
  city: "New York"
};

fetch('http://localhost:3003/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
})
.then(text => {
  console.log('Chat response:');
  console.log(text);
})
.catch(error => {
  console.error('Error:', error.message);
});
