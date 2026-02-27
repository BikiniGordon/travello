namespace Travello.Models
{

    public class AttendeeViewModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string ProfileImage { get; set; }
        public bool IsApproved { get; set; }
    }


    public class ExpenseViewModel
    {
        public string Name { get; set; }
        public decimal Amount { get; set; }
    }


    public class PlaceViewModel
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public List<ExpenseViewModel> Expenses { get; set; } = new();
    }


    public class DayViewModel
    {
        public int DayNumber { get; set; }
        public List<PlaceViewModel> Places { get; set; } = new();
    }


    public class JoinQuestionViewModel
    {
        public int Id { get; set; }
        public string QuestionText { get; set; }
    }


    public class AdditionViewModel
    {
        public string Question { get; set; }
        public string Answer { get; set; }
    }


    public class EventDetailViewModel
    {
        public int EventId { get; set; }
        public string EventTitle { get; set; }
        public string Category { get; set; }
        public string HostName { get; set; }
        public string HostProfileImage { get; set; }
        public string CoverImage { get; set; }
        public string Detail { get; set; }
        public string TripRules { get; set; }
        public DateTime ClosingDate { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Location { get; set; }
        public int RemainingSlots { get; set; }
        public int AttendeeCount { get; set; }
        public string UserStatus { get; set; } // none | pending | approved | rejected | owner
        public decimal TotalExpenses { get; set; }

        public List<string> PackingList { get; set; } = new();
        public List<DayViewModel> Days { get; set; } = new();
        public List<AttendeeViewModel> Attendees { get; set; } = new();
        public List<JoinQuestionViewModel> JoinQuestions { get; set; } = new();
        public List<AdditionViewModel> Additions { get; set; } = new();
    }
}