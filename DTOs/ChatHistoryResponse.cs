namespace Travello.DTOs 
{
    public class ChatHistoryResponse
    {
        public string message_text { get; set; }
        public string image_url {get; set;}
        public string document_url { get; set; }
        public string document_name { get; set; }
        public DateTime timestamp { get; set; }
        public string sender_id { get; set; }
        public string sender_name { get; set; }
        public string sender_img { get; set; }
    }
}