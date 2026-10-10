from django.core.files.uploadedfile import UploadedFile
from google import genai

from users.datamodels import ReceiptProcessModel

# client = genai.Client()

# response = client.models.generate_content(
#     model="gemini-flash-latest",
#     contents="Explain how AI works in a few words",
# )

# print(response.text)

# from google import genai

# client = genai.Client()

# uploaded_file = client.files.upload(file="path/to/organ.jpg")

# interaction = client.interactions.create(
#     model="gemini-3.8-flash",
#     input=[
#         {"type": "text", "text": "Caption this image."},
#         {
#             "type": "image",
#             "uri": uploaded_file.uri,
#             "mime_type": uploaded_file.mime_type
#         }
#     ]
# )
# print(interaction.output_text)


# from google import genai
# from pydantic import BaseModel, Field
# from typing import List, Optional

# class Ingredient(BaseModel):
#     name: str = Field(description="Name of the ingredient.")
#     quantity: str = Field(description="Quantity of the ingredient, including units.")

# class Recipe(BaseModel):
#     recipe_name: str = Field(description="The name of the recipe.")
#     prep_time_minutes: Optional[int] = Field(description="Optional time in minutes to prepare the recipe.")
#     ingredients: List[Ingredient]
#     instructions: List[str]

# client = genai.Client()

# prompt = """
# Please extract the recipe from the following text.
# The user wants to make delicious chocolate chip cookies.
# They need 2 and 1/4 cups of all-purpose flour, 1 teaspoon of baking soda,
# 1 teaspoon of salt, 1 cup of unsalted butter (softened), 3/4 cup of granulated sugar,
# 3/4 cup of packed brown sugar, 1 teaspoon of vanilla extract, and 2 large eggs.
# For the best part, they'll need 2 cups of semisweet chocolate chips.
# First, preheat the oven to 375°F (190°C). Then, in a small bowl, whisk together the flour,
# baking soda, and salt. In a large bowl, cream together the butter, granulated sugar, and brown sugar
# until light and fluffy. Beat in the vanilla and eggs, one at a time. Gradually beat in the dry
# ingredients until just combined. Finally, stir in the chocolate chips. Drop by rounded tablespoons
# onto ungreased baking sheets and bake for 9 to 11 minutes.
# """

# interaction = client.interactions.create(
#     model="gemini-3.8-flash",
#     input=prompt,
#     response_format={
#         "type": "text",
#         "mime_type": "application/json",
#         "schema": Recipe.model_json_schema()
#     },
# )

# recipe = Recipe.model_validate_json(interaction.output_text)
# print(recipe)






class GeminiProvider:
    def __init__(self):
        self.client = genai.Client()
    
    def receipt_process(self, receipt_image: UploadedFile, category_choices: list[str]) -> ReceiptProcessModel:
        mime_type = getattr(receipt_image, "content_type", None) or "image/jpeg"
        receipt_image.seek(0)
        uploaded_file = self.client.files.upload(
            file=receipt_image.file,
            config={"mime_type": mime_type},
        )
        receipt_process_prompt = f"""
        Parse the following receipt and extract the items and their prices. Also pick the category of the receipt that best fits from the list of categories: [{", ".join(category_choices)}]. 
        Look at the store title and the items to decide this. If unsure, pick Other.
        For each item, also categorize the item on what you think it is. Make sure to check the overall category of the receipt, since this may modify it. 
        """
        interaction = self.client.interactions.create(
            model="gemini-3.8-flash",
            input=[{"type": "text", "text": receipt_process_prompt}, {"type": "image", "uri": uploaded_file.uri, "mime_type": uploaded_file.mime_type or mime_type}],
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": ReceiptProcessModel.model_json_schema()
            },
        )
        return ReceiptProcessModel.model_validate_json(interaction.output_text)
