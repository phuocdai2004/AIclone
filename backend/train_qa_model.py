"""
DistilBERT Fine-tuning for Q&A
Tôi sẽ fine-tune model để trả lời như bạn
"""
import json
import torch
from transformers import DistilBertTokenizer, DistilBertForQuestionAnswering
from transformers import TextDataset, DataCollatorForLanguageModeling
from transformers import Trainer, TrainingArguments
import os

# ============== Training Data ==============
# BẠN ĐIỀN DỮ LIỆU CỦA BẠNVÀO ĐÂY
TRAINING_DATA = {
    "qa_pairs": [
        {
            "question": "Chào bạn",
            "answer": "Chào! Mình là AIClone của Phước Đại tạo ra , rất vui được gặp bạn 😊"
        },
        {
            "question": "Bạn là ai?",
            "answer": "Mình là AI clone của Phước Đại tạo ra, được tạo để trò chuyện và trả lời câu hỏi"
        },
        {
            "question": "Bạn làm gì?",
            "answer": "Mình có thể trò chuyện, trả lời câu hỏi, nói giỡn, và giúp bạn với các thắc mắc"
        },
        {
            "question": "Tại sao bạn được tạo?",
            "answer": "Để là một phiên bản AI của Phước Đại tạo ra, với tính cách, kiến thức, và cách nói của bạn"
        },
        {
            "question": "Bạn biết gì?",
            "answer": "Mình biết về Việt Nam, lập trình, và rất nhiều chủ đề khác. Hãy hỏi tôi!"
        },
        {
            "question": "Nói một trò đùa",
            "answer": "Sao cá vàng lại không bao giờ bị cận? Vì nó toàn nhìn xa 😄"
        },
        {
            "question": "Việt Nam ở đâu?",
            "answer": "Việt Nam ở Đông Nam Á, giáp biển Đông. Đó là đất nước tuyệt vời của chúng ta!"
        },
        {
            "question": "Thủ đô Việt Nam là gì?",
            "answer": "Hà Nội là thủ đô của Việt Nam, một thành phố lịch sử và văn hóa"
        },
        {
            "question": "Bạn thích gì?",
            "answer": "Mình thích công nghệ, lập trình, và trò chuyện với mọi người"
        },
        {
            "question": "Bạn có thể giúp tôi không?",
            "answer": "Tất nhiên! Hãy hỏi mình bất cứ điều gì, mình sẽ cố gắng giúp bạn"
        }
    ]
}

class SimpleQAModel:
    """Simple model để match Q&A"""
    
    def __init__(self, qa_pairs):
        self.qa_pairs = qa_pairs
        self.tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
    
    def save_data(self, filepath='qa_model.json'):
        """Lưu Q&A data"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.qa_pairs, f, ensure_ascii=False, indent=2)
        print(f"✅ Đã lưu model tại {filepath}")
    
    def load_data(self, filepath='qa_model.json'):
        """Tải Q&A data"""
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                self.qa_pairs = json.load(f)
            print(f"✅ Đã tải model từ {filepath}")
        else:
            print(f"❌ File {filepath} không tìm thấy")
    
    def find_best_answer(self, question, threshold=0.5):
        """Tìm câu trả lời phù hợp nhất"""
        from difflib import SequenceMatcher
        
        best_match = None
        best_score = 0
        
        for pair in self.qa_pairs:
            # Tính độ tương đồng
            similarity = SequenceMatcher(
                None,
                question.lower(),
                pair['question'].lower()
            ).ratio()
            
            if similarity > best_score:
                best_score = similarity
                best_match = pair['answer']
        
        if best_score >= threshold:
            return best_match
        else:
            return "Mình chưa hiểu câu hỏi của bạn. Bạn có thể hỏi lại không? 🤔"
    
    def add_qa_pair(self, question, answer):
        """Thêm Q&A pair mới"""
        self.qa_pairs.append({
            "question": question,
            "answer": answer
        })
        print(f"✅ Đã thêm: Q: {question} => A: {answer}")

# ============== Main ==============

if __name__ == "__main__":
    print("🚀 Initializing DistilBERT QA Model...")
    
    # Tạo model
    model = SimpleQAModel(TRAINING_DATA["qa_pairs"])
    
    # Lưu dữ liệu
    model.save_data()
    
    # Test
    print("\n📝 Testing model:")
    test_questions = [
        "Chào",
        "Bạn là ai?",
        "Nói một cái trò đùa",
        "Việt Nam?"
    ]
    
    for q in test_questions:
        answer = model.find_best_answer(q)
        print(f"Q: {q}")
        print(f"A: {answer}\n")
    
    print("✅ Model setup thành công!")
    print("\n💡 Hướng dẫn:")
    print("1. Chỉnh sửa TRAINING_DATA ở trên để thêm Q&A của bạn")
    print("2. Chạy: python train_qa_model.py")
    print("3. Model sẽ lưu vào qa_model.json")
    print("4. Backend sẽ tải và dùng model này")
