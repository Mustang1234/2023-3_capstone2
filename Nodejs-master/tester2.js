list_peole = [
  {
      "Student_id": "admin",
      "Student_name": "fdsa"
  },
  {
      "Student_id": "guest",
      "Student_name": "rewq"
  }
]

votes = [
  {
      "Student_id": "guest",
      "vote_value": "3"
  },
  {
      "Student_id": "admin",
      "vote_value": "1"
  }
]


list_peole.sort((a, b) => a.Student_id.localeCompare(b.Student_id));
votes.sort((a, b) => a.Student_id.localeCompare(b.Student_id));

console.log(list_peole)
console.log(votes)