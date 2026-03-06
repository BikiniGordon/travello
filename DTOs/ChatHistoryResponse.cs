namespace Travello.DTOs // หรือ Travello.DTOs
{
    // คลาสนี้มีไว้ "ส่งข้อมูล" ไปให้หน้าเว็บโดยเฉพาะ (ไม่ได้เอาไปเซฟลง DB)
    public class ChatHistoryResponse
    {
        public string message_text { get; set; }
        public DateTime timestamp { get; set; }
        public string sender_id { get; set; }
        public string sender_name { get; set; }
        public string sender_img { get; set; }
    }
}