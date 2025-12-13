"""
Convert CSV Training Data to JSON Model
"""
import csv
import json

def csv_to_json(csv_file='training_data.csv', json_file='qa_model.json'):
    """Convert CSV to JSON format"""
    qa_pairs = []
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('question') and row.get('answer'):
                    qa_pairs.append({
                        "question": row['question'].strip(),
                        "answer": row['answer'].strip()
                    })
        
        # Save to JSON
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(qa_pairs, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Convert thành công!")
        print(f"📝 {len(qa_pairs)} Q&A pairs")
        print(f"💾 Lưu vào: {json_file}")
        
        return qa_pairs
    
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return []

def show_data(json_file='qa_model.json'):
    """Hiển thị dữ liệu đã lưu"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"\n📊 Dữ liệu hiện tại ({len(data)} cặp):")
        print("=" * 60)
        for i, pair in enumerate(data, 1):
            print(f"{i}. Q: {pair['question']}")
            print(f"   A: {pair['answer']}\n")
    
    except Exception as e:
        print(f"❌ Không tìm thấy file: {e}")

if __name__ == "__main__":
    print("🚀 Training Data Converter")
    print("=" * 60)
    
    # Convert CSV to JSON
    csv_to_json()
    
    # Show converted data
    show_data()
    
    print("\n💡 Hướng dẫn:")
    print("1. Sửa training_data.csv - thêm Q&A của bạn")
    print("2. Chạy: python convert_data.py")
    print("3. qa_model.json sẽ được update")
    print("4. Backend tự động load model mới")
